import { CheckboxSeverity } from '@shared/components/checkbox/checkbox';

export interface NewsTag {
  id: string;
  name: string;
  severity?: CheckboxSeverity;
  color?: string;
  textColor?: string;
}
