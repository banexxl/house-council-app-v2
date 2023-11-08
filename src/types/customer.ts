import * as Yup from 'yup';

export interface Customer {
          _id?: string;
          fullAddress: string;
          ApartmentNumber?: number;
          avatar?: string;
          email?: string;
          firstName: string;
          lastName: string;
          phoneNumber: string;
          dateOfBirth?: string;
          updatedAt?: string;
          isOwner?: boolean;
          isSubtenant?: boolean;
          permissionLevel?: number;
          buildingID?: string;
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

          fullAddress: Yup.string().max(100).required('Full addreess is required'),

          ApartmentNumber: Yup.number().typeError('You must specify a number').min(1, 'Apartment number must be greather then 0'),

          email: Yup.string().email('Invalid email address').required('Email is required'),

          phoneNumber: Yup.string()
                    .matches(/^[0-9]+$/, 'Phone number must contain only digits')
                    .min(10, 'Phone number must be at least 10 digits')
                    .max(15, 'Phone number cannot exceed 15 digits')
                    .required('Phone number is required'),

          isOwner: Yup.boolean()
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