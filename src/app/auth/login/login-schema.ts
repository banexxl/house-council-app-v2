import * as Yup from 'yup';

export interface ValuesEmailOnly {
     email: string;
}

export interface ValuesEmailAndPassword {
     email: string;
     password: string;
}

export const initialValuesEmailOnly: ValuesEmailOnly = {
     email: '',
};

export const initialValuesEmailAndPassword: ValuesEmailAndPassword = {
     email: '',
     password: '',
};

export const validationSchemaEmailOnly = Yup.object({
     email: Yup.string().email('Must be a valid email').max(40).required('Email is required'),
});

export const validationSchemaEmailAndPassword = Yup.object({
     email: Yup.string().email('Must be a valid email').max(40).required('Email is required'),
     password: Yup.string().max(40).required('Password is required'),
});
