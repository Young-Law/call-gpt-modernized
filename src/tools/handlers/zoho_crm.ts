import axios from 'axios';
import { executeWithAuthRetry } from './zoho_auth.js';
import type { 
  LeadDetails, 
  EventDetails, 
  CrmLead, 
  AppointmentType, 
  StaffMember 
} from '../../types/index.js';

const ZOHO_CRM_API_URL = 'https://www.zohoapis.com/crm/v2';

function parseSelectionList(rawList: string | undefined): AppointmentType[] | StaffMember[] {
  if (!rawList) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawList);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to parse Zoho selection list JSON:', (error as Error).message);
    return [];
  }
}

export function listAppointmentTypes(): AppointmentType[] {
  return parseSelectionList(process.env.ZOHO_APPOINTMENT_TYPES);
}

export function listStaffMembers(): StaffMember[] {
  return parseSelectionList(process.env.ZOHO_STAFF_MEMBERS);
}

interface ResolveSelectionParams {
  selection: string | undefined;
  list: AppointmentType[] | StaffMember[];
  idKeys: string[];
  label: string;
}

function resolveSelection({ selection, list, idKeys, label }: ResolveSelectionParams): string | null {
  if (!selection) {
    return null;
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${label} list is not configured. Set the corresponding ZOHO_* environment variable to a valid JSON array.`);
  }

  const normalizedSelection = String(selection).trim().toLowerCase();
  const match = list.find((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const nameMatch = item.name && String(item.name).trim().toLowerCase() === normalizedSelection;
    if (nameMatch) {
      return true;
    }

    return idKeys.some((key) => {
      const value = (item as Record<string, unknown>)[key];
      return value && String(value).trim().toLowerCase() === normalizedSelection;
    });
  });

  if (!match) {
    const options = list
      .map((item) => (item as Record<string, unknown>).name || (item as Record<string, unknown>).id || (item as Record<string, unknown>).resource_id || (item as Record<string, unknown>).staff_id)
      .filter(Boolean)
      .join(', ');
    throw new Error(`${label} "${selection}" not found. Available options: ${options || 'none configured'}.`);
  }

  const idKey = idKeys.find((key) => (match as Record<string, unknown>)[key]);
  return idKey ? String((match as Record<string, unknown>)[idKey]) : selection;
}

function withAuthHeaders(token: string): { Authorization: string } {
  return { Authorization: `Zoho-oauthtoken ${token}` };
}

export async function createCrmLead(leadDetails: LeadDetails): Promise<string> {
  const { first_name, last_name, email, phone } = leadDetails;

  const crmData = {
    data: [{
      First_Name: first_name,
      Last_Name: last_name,
      Email: email,
      Phone: phone,
      Lead_Source: 'Phone Call Intake',
    }],
  };

  try {
    const response = await executeWithAuthRetry((token) => axios.post(
      `${ZOHO_CRM_API_URL}/Leads`,
      crmData,
      { headers: withAuthHeaders(token) },
    ));

    const result = response.data.data[0];
    if (result.status === 'success') {
      console.log(`Successfully created lead with ID: ${result.details.id}`);
      return result.details.id;
    }

    throw new Error(`Error creating CRM lead: ${JSON.stringify(result)}`);
  } catch (error) {
    const axiosError = error as { response?: { data: unknown }; message: string };
    console.error('Error in createCrmLead:', axiosError.response ? JSON.stringify(axiosError.response.data) : axiosError.message);
    throw error;
  }
}

export async function createCrmEvent(eventDetails: EventDetails): Promise<string> {
  const { event_title, start_datetime, end_datetime, lead_id, appointment_type, staff_member } = eventDetails;

  const eventPayload: Record<string, unknown> = {
    Event_Title: event_title,
    Start_DateTime: start_datetime,
    End_DateTime: end_datetime,
  };

  const appointmentTypes = listAppointmentTypes();
  const staffMembers = listStaffMembers();
  const resourceId = resolveSelection({
    selection: appointment_type,
    list: appointmentTypes,
    idKeys: ['resource_id', 'id'],
    label: 'Appointment type',
  });
  const staffId = resolveSelection({
    selection: staff_member,
    list: staffMembers,
    idKeys: ['staff_id', 'id'],
    label: 'Staff member',
  });

  if (resourceId) {
    eventPayload.Resource_Id = resourceId;
  }

  if (staffId) {
    eventPayload.Staff_Id = staffId;
  }

  if (lead_id) {
    eventPayload.$se_module = 'Leads';
    eventPayload.What_Id = { id: lead_id };
  }

  const eventData = {
    data: [eventPayload],
  };

  try {
    const response = await executeWithAuthRetry((token) => axios.post(
      `${ZOHO_CRM_API_URL}/Events`,
      eventData,
      { headers: withAuthHeaders(token) },
    ));

    const result = response.data.data[0];
    if (result.status === 'success') {
      console.log(`Successfully created event with ID: ${result.details.id}`);
      return result.details.id;
    }

    throw new Error(`Error creating CRM event: ${JSON.stringify(result)}`);
  } catch (error) {
    const axiosError = error as { response?: { data: unknown }; message: string };
    console.error('Error in createCrmEvent:', axiosError.response ? JSON.stringify(axiosError.response.data) : axiosError.message);
    throw error;
  }
}

export async function findCrmLeadByEmail(email: string): Promise<CrmLead | null> {
  try {
    const response = await executeWithAuthRetry((token) => axios.get(
      `${ZOHO_CRM_API_URL}/Leads/search`,
      {
        params: { email },
        headers: withAuthHeaders(token),
      },
    ));

    if (response.data && response.data.data) {
      return response.data.data[0];
    }

    return null;
  } catch (error) {
    const axiosError = error as { response?: { data: { code: string } }; message: string };
    if (axiosError.response && axiosError.response.data && axiosError.response.data.code === 'NO_RECORDS_FOUND') {
      return null;
    }

    console.error('Error in findCrmLeadByEmail:', axiosError.response ? JSON.stringify(axiosError.response.data) : axiosError.message);
    throw error;
  }
}

export async function getEventsByTimeRange(start_datetime: string, end_datetime: string): Promise<Array<{ id: string }>> {
  const query = `select id from Events where (Start_DateTime <= '${end_datetime}' and End_DateTime >= '${start_datetime}')`;

  try {
    const response = await executeWithAuthRetry((token) => axios.post(
      `${ZOHO_CRM_API_URL}/coql`,
      { select_query: query },
      { headers: withAuthHeaders(token) },
    ));

    return response.data.data || [];
  } catch (error) {
    const axiosError = error as { response?: { status: number }; message: string };
    if (axiosError.response && axiosError.response.status === 204) {
      return [];
    }

    console.error('Error in getEventsByTimeRange:', axiosError.response ? JSON.stringify(axiosError.response.data) : axiosError.message);
    throw error;
  }
}

export { resolveSelection };
