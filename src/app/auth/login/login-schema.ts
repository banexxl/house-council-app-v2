import * as Yup from 'yup';

export interface Values {
     email: string;
}

export const initialValues: Values = {
     email: '',
};

export const validationSchema = Yup.object({
     email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
});