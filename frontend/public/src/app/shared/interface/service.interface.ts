import { PaginateModel } from './core.interface';

export interface ServiceModel extends PaginateModel {
  data: Service[];
}

export interface Service {
  id: number;
  name: string;
  icon: string;
  description: string;
  status: number;
}
