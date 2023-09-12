import { MongoClient } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!, {})
          const dbTenants = mongoClient.db('HouseCouncilAppDB').collection('Tenants')

          try {
                    if (request.method === 'GET') {

                              const page = request.query.page as string; // Explicit casting to string
                              const rowsPerPage = request.query.rowsPerPage as string; // Explicit casting to string
                              const sortBy = request.query.sortBy as string | undefined; // Explicit casting to string or undefined
                              const sortDir = request.query.sortDir as string | undefined; // Explicit casting to string or undefined

                              const skip = parseInt(page) * parseInt(rowsPerPage);
                              const limit = parseInt(rowsPerPage);
                              const sortField = sortBy || 'updatedAt'; // Default to updatedAt if sortBy is not provided
                              const sortOrder = sortDir === 'desc' ? -1 : 1; // Descending (-1) or Ascending (1)

                              const query = {};

                              const allTenants = await dbTenants
                                        .find(query)
                                        .sort({ [sortField]: sortOrder })
                                        .skip(skip)
                                        .limit(limit)
                                        .toArray();

                              const totalCount = await dbTenants.countDocuments(query);

                              return response.status(200).json({ message: 'Customers found!', data: allTenants, totalCount });
                    } else if (request.method === 'POST') {

                              const customerExists = await dbTenants.findOne({ email: request.body.email })

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


