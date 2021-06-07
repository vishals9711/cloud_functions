export interface CENTER_RESPONSE {
  centers?: Array<CentersEntity> | null;
}
export interface CentersEntity {
  center_id: number; // eslint-disable-line
  name: string;
  name_l: string; // eslint-disable-line
  address: string;
  address_l: string; // eslint-disable-line
  state_name: string; // eslint-disable-line
  state_name_l: string; // eslint-disable-line
  district_name: string; // eslint-disable-line
  district_name_l: string; // eslint-disable-line
  block_name: string; // eslint-disable-line
  block_name_l: string; // eslint-disable-line
  pincode: string;
  lat: number;
  long: number;
  from: string;
  to: string;
  fee_type: string; // eslint-disable-line
  vaccine_fees?: Array<VaccineFeesEntity> | null; // eslint-disable-line
  sessions?: Array<SessionsEntity> | null;
}
export interface VaccineFeesEntity {
  vaccine: string;
  fee: string;
}
export interface SessionsEntity {
  session_id: string; // eslint-disable-line
  date: string;
  available_capacity: number; // eslint-disable-line
  min_age_limit: number; // eslint-disable-line
  vaccine: string;
  slots?: Array<string> | null;
}

export interface FIRESTORE_ALERT {
  age_category: number; // eslint-disable-line
  district_id: number; // eslint-disable-line
  district_name: string; // eslint-disable-line
  state_id: number; // eslint-disable-line
  state_name: string; // eslint-disable-line
  date_updated: string; // eslint-disable-line
  available: boolean;
}
