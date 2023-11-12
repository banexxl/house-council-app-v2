const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
          // Basic tenant information
          firstName: {
                    type: String,
                    required: true,
                    minlength: 2,
                    maxlength: 50,
          },

          lastName: {
                    type: String,
                    required: true,
                    minlength: 2,
                    maxlength: 50,
          },

          dateOfBirth: {
                    type: Date,
                    required: true,
          },

          gender: {
                    type: String,
                    enum: ['Male', 'Female'],
                    required: true,
          },

          email: {
                    type: String,
                    required: false,
                    unique: true,
                    validate: {
                              validator: (value: any) => {
                                        // Simple email validation
                                        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                                        return emailRegex.test(value);
                              },
                              message: 'Invalid email address',
                    },
          },

          phoneNumber: {
                    type: String,
                    required: true,
                    validate: {
                              validator: (value: any) => {
                                        // Simple phone number validation (digits only)
                                        const phoneRegex = /^[0-9]+$/;
                                        return phoneRegex.test(value);
                              },
                              message: 'Invalid phone number',
                    },
          },

          // Address and apartment information
          buildingAddress: {
                    type: String,
                    required: true,
                    minlength: 5,
                    maxlength: 100,
          },

          apartmentNumber: {
                    type: String,
                    required: true,
                    minlength: 1,
                    maxlength: 10,
          },

          // Ownership information (if applicable)
          isOwner: {
                    type: Boolean,
                    default: false,
          },
});

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
