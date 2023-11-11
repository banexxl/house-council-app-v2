import * as Yup from 'yup';

export interface Customer {
          _id?: string;
          avatar?: string;
          email: string;
          firstName: string;
          lastName: string;
          phoneNumber: string;
          dateOfBirth?: string;
          updatedDateTime?: string;
          createdDateTime?: string;
          isOwner?: boolean;
          isSubtenant?: boolean;
          permissionLevel: number;
}


export const customerSchema = Yup.object({
          firstName: Yup.string()
                    .min(2, 'First name must be at least 2 characters')
                    .max(50, 'First name cannot exceed 50 characters')
                    .required('First name is required'),

          lastName: Yup.string()
                    .min(2, 'Last name must be at least 2 characters')
                    .max(50, 'Last name cannot exceed 50 characters')
                    .required('Last name is required'),

          email: Yup.string().email('Invalid email address').required('Email is required'),

          phoneNumber: Yup.string()
                    .matches(/^[0-9]+$/, 'Phone number must contain only digits')
                    .min(10, 'Phone number must be at least 10 digits')
                    .max(15, 'Phone number cannot exceed 15 digits')
                    .required('Phone number is required'),
});

export default customerSchema;

export interface CustomerLog {
          _id: string;
          createdDateTime: number;
          description: string;
          ip: string;
          method: string;
          route: string;
          status: number;
}