import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!, {})
          const dbTenants = mongoClient.db('HouseCouncilAppDB').collection('Tenants')
          const apiUrl = process.env.NODE_ENV === 'development' ?
                    process.env.NEXT_DEV_URL : process.env.NEXT_VERCEL_DEV_URL

          try {
                    if (request.method === 'GET') {

                              const page = parseInt(request.query.page as string) // Explicit casting to string
                              const rowsPerPage = parseInt(request.query.rowsPerPage as string)
                              const sortBy = request.query.sortBy as string | undefined; // Explicit casting to string or undefined
                              const sortDir = request.query.sortDir as string | undefined; // Explicit casting to string or undefined
                              const skip = page * rowsPerPage
                              const sortOrder = sortDir === 'desc' ? -1 : 1; // Descending (-1) or Ascending (1)

                              const allTenants = await dbTenants
                                        .find({})
                                        .limit(rowsPerPage)
                                        .sort({ sortBy: sortOrder })
                                        .skip(skip)
                                        .toArray();

                              const totalCount = allTenants.length

                              return response.status(200).json({ message: 'Customers found!', data: allTenants, totalCount });

                    } else if (request.method === 'POST') {
                              console.log('create customer request body', request.body);

                              const customerExists = await dbTenants.findOne({ email: request.body.email })

                              if (customerExists === null) {
                                        await dbTenants.insertOne(request.body)
                                        return response.status(200).json({ message: 'Customer successfully added!' });
                              } else {
                                        const error = new Error('Customer already exists!');
                                        (error as any).cause = { status: 409 };
                                        return response.status(409).json({ error: error });
                              }
                    }
                    else if (request.method === 'PUT') {

                              try {
                                        await dbTenants.findOneAndUpdate({ _id: new ObjectId(request.body._id) },
                                                  {
                                                            $set: {
                                                                      fullAddress: request.body.fullAddress || '',
                                                                      email: request.body.email || '',
                                                                      firstName: request.body.firstName || '',
                                                                      lastName: request.body.lastName || '',
                                                                      phoneNumber: request.body.phoneNumber || '',
                                                                      apartmentNumber: request.body.apartmentNumber || '',
                                                                      avatar: request.body.avatar || '',
                                                                      updatedDateTime: request.body.updatedDateTime || '',
                                                                      dateOfBirth: request.body.dateOfBirth || '',
                                                                      isOwner: request.body.isOwner || '',
                                                            }
                                                  })
                                        return response.status(200).json({ message: 'Customer successfully updated!' });
                              } catch (error) {
                                        console.log(error);
                              }

                    }
                    else if (request.method === 'DELETE') {
                              console.log('customers api delete request', request.body);

                              const objectIdArray = request.body.map((_id: any) => new ObjectId(_id));

                              try {
                                        await dbTenants.deleteMany({ _id: { $in: objectIdArray } })
                                                  .then(async (deleteTenantResponse: any) => {

                                                            if (deleteTenantResponse.acknowledged) {
                                                                      try {
                                                                                await fetch(`${apiUrl}/api/buildings/delete-building-customers-api`, {
                                                                                          method: 'PUT',
                                                                                          headers: {
                                                                                                    'Content-Type': 'application/json',
                                                                                                    'Access-Control-Allow-Origin': '*',
                                                                                                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                                          },
                                                                                          body: JSON.stringify({
                                                                                                    tenantsToRemove: request.body,
                                                                                                    //ovo ispod nemamo
                                                                                                    buildingID: request.body.buildingID
                                                                                          })
                                                                                })
                                                                                return response.status(200).json({ message: 'Customer successfully added!' });
                                                                      } catch (error) {
                                                                                return response.status(500).json({ message: 'update-building-customer-api failed!' });
                                                                      }

                                                            }
                                                            else return response.status(400).json({ message: 'Something went wrong!' })
                                                  })
                                        return response.status(200).json({ message: 'Customer successfully deleted!' });
                              } catch (error) {
                                        console.log(error);
                              }
                    }
                    else {
                              return response.status(405).json({ error: 'Method not allowed!' });
                    }
          } catch (error) {
                    return response.status(500).json({ error: 'Internal server error!' });
          } finally {
                    await mongoClient.close();
          }


}


