
import clientPromise from '@/libs/mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export const customersApi = async (request: NextApiRequest, response: NextApiResponse) => {

          if (request.method === 'GET') {
                    try {
                              const mongoClient = await clientPromise
                              const mongoDB = mongoClient.db("HouseCouncilAppDB")
                              const allTenants = await mongoDB.collection("Tenants").find({}).toArray()

                              if (allTenants.length > 0) {
                                        return response.status(200).json({ message: 'Customers found!', data: allTenants })
                              } else {
                                        return response.status(404).json({ error: 'Searched products not found!' });
                              }
                    } catch (error) {
                              return response.status(500).json({ error: 'Internal server error!' });
                    }
          } else if (request.method === 'POST') {
                    console.log('usao u post metodu');

                    const mongoClient = await clientPromise

                    try {
                              const db = mongoClient.db('HouseCouncilAppDB');
                              const customerExists = await db.collection('Tenants').findOne({ _id: request.body.customer._id });

                              if (customerExists === null) {
                                        return await db.collection('Tenants').insertOne(request.body.customer);
                              } else {
                                        const error = new Error('Customer already exists!');
                                        // Attach custom properties to the error object
                                        (error as any).cause = { status: 409 };
                                        throw error;
                              }
                    } catch (error: any) {
                              return { message: error.message }
                    }
                    finally {
                              await mongoClient.close();
                    }
          } else {
                    return response.status(405).json({ error: 'Method not allowed!' });
          }
};