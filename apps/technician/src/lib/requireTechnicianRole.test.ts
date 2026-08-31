import { technicianGateMessage } from './requireTechnicianRole';

if (technicianGateMessage(null) == null) {
  throw new Error('Missing role must block the field app');
}
if (technicianGateMessage('customer') == null) {
  throw new Error('Customer tokens must not open technician jobs');
}
if (technicianGateMessage('admin') == null) {
  throw new Error('Admin tokens must not open technician jobs');
}
if (technicianGateMessage('technician') !== null) {
  throw new Error('Technician role must be allowed through');
}
console.log('requireTechnicianRole OK');
