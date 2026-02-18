import { listStaffMembers } from './zoho_crm.js';
import type { ToolHandler } from '../../types/index.js';

interface ListStaffMembersResult {
  status: string;
  staff_members: ReturnType<typeof listStaffMembers>;
}

const listStaffMembersHandler: ToolHandler = async (): Promise<ListStaffMembersResult> => {
  const staffMembers = listStaffMembers();

  return {
    status: 'success',
    staff_members: staffMembers,
  };
};

export default listStaffMembersHandler;
