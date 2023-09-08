import * as Yup from 'yup';

const tenantSchema = Yup.object().shape({
          firstName: Yup.string()
                    .min(2, 'First name must be at least 2 characters')
                    .max(50, 'First name cannot exceed 50 characters')
                    .required('First name is required'),

          lastName: Yup.string()
                    .min(2, 'Last name must be at least 2 characters')
                    .max(50, 'Last name cannot exceed 50 characters')
                    .required('Last name is required'),

          dateOfBirth: Yup.date(),

          gender: Yup.string()
                    .oneOf(['Male', 'Female'], 'Invalid gender')
                    .required('Gender is required'),

          email: Yup.string().email('Invalid email address'),

          phoneNumber: Yup.string()
                    .matches(/^[0-9]+$/, 'Phone number must contain only digits')
                    .min(10, 'Phone number must be at least 10 digits')
                    .max(15, 'Phone number cannot exceed 15 digits')
                    .required('Phone number is required'),

          isOwner: Yup.boolean()
});

export default tenantSchema;