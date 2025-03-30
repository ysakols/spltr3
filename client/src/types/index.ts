import { Group as BaseGroup, User } from '@shared/schema';

// Extend the base Group type with additional properties that may be returned by the API
export interface ExtendedGroup extends BaseGroup {
  creatorInfo?: User;
  members?: User[];
}