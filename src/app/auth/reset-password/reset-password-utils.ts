import * as Yup from "yup";

// Validation schema using Yup
export const validationSchemaWithOldPassword = Yup.object({
     oldPassword: Yup.string().required("Old password is required"),
     newPassword: Yup.string()
          .min(8, "Password must be at least 8 characters")
          .required("Password is required")
          .matches(
               /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
               "Password must include an uppercase letter, lowercase letter, number, and special character.",
          ),
     confirmPassword: Yup.string()
          .oneOf([Yup.ref("newPassword")], "Passwords must match")
          .required("Confirm password is required"),
})

// Validation schema using Yup
export const validationSchemaNoOldPassword = Yup.object({
     newPassword: Yup.string()
          .min(8, "Password must be at least 8 characters")
          .required("Password is required")
          .matches(
               /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
               "Password must include an uppercase letter, lowercase letter, number, and special character.",
          ),
     confirmPassword: Yup.string()
          .oneOf([Yup.ref("newPassword")], "Passwords must match")
          .required("Confirm password is required"),
})

// Password strength calculation
export const calculatePasswordStrength = (password: string): number => {
     if (!password) return 0

     let strength = 0

     // Length check
     if (password.length >= 8) strength += 25

     // Character type checks
     if (/[A-Z]/.test(password)) strength += 25 // Uppercase
     if (/[a-z]/.test(password)) strength += 25 // Lowercase
     if (/[0-9]/.test(password)) strength += 25 // Numbers
     if (/[^A-Za-z0-9]/.test(password)) strength += 25 // Special characters

     return Math.min(100, strength)
}

// Get color based on password strength
export const getStrengthColor = (strength: number): string => {
     if (strength < 30) return "error.main"
     if (strength < 70) return "warning.main"
     return "success.main"
}

// Get label based on password strength
export const getStrengthLabel = (strength: number): string => {
     if (strength < 30) return "Weak"
     if (strength < 70) return "Medium"
     return "Strong"
}