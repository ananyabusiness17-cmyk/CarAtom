import { adminGateMessage } from './requireAdminRole';

if (adminGateMessage(null) == null) {
  throw new Error('Missing role must block ops');
}

if (adminGateMessage('customer') == null) {
  throw new Error('Customer tokens must not open ops');
}

if (adminGateMessage('technician') == null) {
  throw new Error('Technician tokens must not open ops');
}

if (adminGateMessage('admin') !== null) {
  throw new Error('Admin role must be allowed through');
}

console.log('requireAdminRole OK');
