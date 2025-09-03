/**
 * Validation rule types
 */
export interface ValidationMessages {
  required?: string;
  pattern?: string;
  minLength?: string;
  maxLength?: string;
  [key: string]: string | undefined;
}

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  validate?: (value: any) => string | undefined;
  messages: ValidationMessages;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: { [key: string]: string[] };
}

/**
 * Form hook types
 */
export interface FormState<T> {
  values: T;
  errors: { [K in keyof T]?: string[] };
  touched: { [K in keyof T]?: boolean };
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface FormOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onValidationComplete?: (isValid: boolean, errors: { [key: string]: string[] }) => void;
}

export interface FormActions<T> {
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<T | false>;
  resetForm: () => void;
  setValues: (values: Partial<T>, validate?: boolean) => Promise<void>;
  validateForm: (isSubmitting?: boolean) => Promise<boolean>;
  validateField: (name: keyof T, value: any) => Promise<boolean>;
  setErrors: React.Dispatch<React.SetStateAction<{ [K in keyof T]?: string[] }>>;
  setTouched: React.Dispatch<React.SetStateAction<{ [K in keyof T]?: boolean }>>;
}

export type UseFormValidation<T> = FormState<T> & FormActions<T>;
