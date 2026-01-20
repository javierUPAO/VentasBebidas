export interface Bebida {
  brand: string;
  type: string;
  sales?: number;
  count?: number;
  month?: string;
  isNew?: boolean;
  goal?: number;
  mode?: 'first' | 'inline';
  succes?: boolean;
}
