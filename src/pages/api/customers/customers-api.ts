import { MongoClient } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!, {})
          const dbTenants = mongoClient.db('HouseCouncilAppDB').collection('Tenants')
          console.log(request.body);

          try {
                    if (request.method === 'GET') {

                              const allTenants = await dbTenants.find({}).toArray();

                              if (allTenants.length > 0) {
                                        return response.status(200).json({ message: 'Customers found!', data: allTenants })
                              } else {
                                        return response.status(404).json({ error: 'Customer not found!' })
                              }
                    } else if (request.method === 'POST') {

                              const customerExists = await dbTenants.findOne({ email: request.body.email })
                              console.log(customerExists);

                              if (customerExists === null) {
                                        await dbTenants.insertOne(request.body)
                                        return response.status(200).json({ message: 'Customer successfully added!' });
                              } else {
                                        const error = new Error('Customer already exists!');
                                        (error as any).cause = { status: 409 };
                                        return response.status(409).json({ error: error });
                              }
                    } else {
                              return response.status(405).json({ error: 'Method not allowed!' });
                    }
          } catch (error) {
                    return response.status(500).json({ error: 'Internal server error!' });
          } finally {
                    await mongoClient.close();
          }


}


