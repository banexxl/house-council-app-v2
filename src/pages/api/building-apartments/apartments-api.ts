import { Building } from '@/types/building';
import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
          const dbBuildingApartments = mongoClient.db('HouseCouncilAppDB').collection('BuildingApartments')
          const apiUrl = process.env.NODE_ENV === 'development' ?
                    process.env.NEXT_DEV_URL : process.env.NEXT_VERCEL_DEV_URL

          try {
                    if (request.method === 'GET') {

                              // const page = parseInt(request.query.page as string) // Explicit casting to string
                              // const rowsPerPage = parseInt(request.query.rowsPerPage as string)
                              // const sortBy = request.query.sortBy as string | undefined; // Explicit casting to string or undefined
                              // const sortDir = request.query.sortDir as string | undefined; // Explicit casting to string or undefined
                              // const skip = page * rowsPerPage
                              // const sortOrder = sortDir === 'desc' ? -1 : 1; // Descending (-1) or Ascending (1)

                              const allBuildingApartments = await dbBuildingApartments
                                        .find({})
                                        // .limit(rowsPerPage)
                                        // .sort({ sortBy: sortOrder })
                                        // .skip(skip)
                                        .toArray();

                              const totalCount = allBuildingApartments.length

                              return response.status(200).json({ message: 'Buildings found!', data: dbBuildingApartments, totalCount });

                    } else if (request.method === 'POST') {
                              const buildingApartmentExists = await dbBuildingApartments.findOne({
                                        $and: [
                                                  {
                                                            buildingAddress: request.body.buildingAddress
                                                  },
                                                  {
                                                            apartmentNumber: request.body.apartmentNumber
                                                  }
                                        ]
                              })

                              if (buildingApartmentExists === null) {
                                        await dbBuildingApartments.insertOne(request.body).then(async (dbResponse: any) => {

                                                  try {
                                                            if (dbResponse.acknowledged) {

                                                                      await fetch(`${apiUrl}/api/buildings/add-apartment-to-building-api`, {
                                                                                method: 'PUT',
                                                                                headers: {
                                                                                          'Content-Type': 'application/json',
                                                                                          'Access-Control-Allow-Origin': '*',
                                                                                          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                                },
                                                                                body: JSON.stringify({
                                                                                          buildingID: request.body.buildingID,
                                                                                          apartmentId: dbResponse.insertedId,
                                                                                })
                                                                      })
                                                            }
                                                  } catch (error) {
                                                            console.log(error);

                                                  }

                                        })
                                        return response.status(200).json({ message: 'Building successfully added!' });
                              } else {
                                        const error = new Error('Building already exists!');
                                        (error as any).cause = { status: 409 };
                                        return response.status(409).json({ error: error });
                              }
                    } else if (request.method === 'PUT') {
                              console.log('bbbbb', request.body);

                              try {
                                        const res = await dbBuildingApartments.findOneAndUpdate({ _id: new ObjectId(request.body._id) },
                                                  {
                                                            $set:
                                                            {
                                                                      buildingAddress: request.body.buildingAddress,
                                                                      apartmentNumber: request.body.apartmentNumber,
                                                                      surfaceArea: request.body.surfaceArea,
                                                                      bedroomNumber: request.body.bedroomNumber,
                                                                      bathroomNumber: request.body.bathroomNumber,
                                                                      terraceNumber: request.body.terraceNumber,
                                                                      description: request.body.description,
                                                                      images: request.body.images,
                                                                      tenants: request.body.tenants,
                                                                      owners: request.body.owners,
                                                                      status: request.body.status,
                                                                      petFriendly: request.body.petFriendly,
                                                                      smokingAllowed: request.body.smokingAllowed,
                                                                      furnished: request.body.furnished,
                                                                      hasOwnParkingSpace: request.body.hasOwnParkingSpace,
                                                                      utilitiesIncluded: request.body.utilitiesIncluded,
                                                                      createdDateTime: request.body.createdDateTime,
                                                                      updatedDateTime: request.body.updatedDateTime,
                                                            }
                                                  })
                                        if (res === null) {
                                                  return response.status(400).json({ message: 'Something is wrong with the request' });
                                        } else {
                                                  return response.status(200).json({ message: 'Building apartment successfully updated!' });
                                        }
                              } catch (error) {
                                        console.log(error);
                              }

                    } else if (request.method === 'DELETE') {

                              const buildingExists = await dbBuildingApartments.findOne({ _id: request.body })
                              if (buildingExists === null) {
                                        await dbBuildingApartments.deleteOne({ _id: new ObjectId(request.body) })
                                        return response.status(200).json({ message: 'Building successfully deleted!' });
                              } else {
                                        const error = new Error('Building does not exist!');
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


