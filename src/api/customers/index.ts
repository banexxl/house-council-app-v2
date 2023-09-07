
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
          } else {
                    return response.status(405).json({ error: 'Method not allowed!' });
          }
};