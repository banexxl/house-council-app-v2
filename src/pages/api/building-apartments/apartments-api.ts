import { Building } from '@/types/building';
import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
          const dbBuildingApartments = mongoClient.db('HouseCouncilAppDB').collection('BuildingApartments')
          console.log(process.env.NODE_ENV);
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
                              console.log('usao u apartment api post', request.body);

                              const buildingApartmentExists = await dbBuildingApartments.findOne({
                                        $and: [
                                                  {
                                                            fullAddress: request.body.fullAddress
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

                                                                      await fetch(`${apiUrl}/api/buildings/update-building-apartment-api`, {
                                                                                method: 'PUT',
                                                                                headers: {
                                                                                          'Content-Type': 'application/json',
                                                                                          'Access-Control-Allow-Origin': '*',
                                                                                          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                                },
                                                                                body: JSON.stringify({
                                                                                          apartmentId: dbResponse.insertedId,
                                                                                          apartmentNumber: request.body.apartmentNumber,
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

                              try {
                                        await dbBuildingApartments.findOneAndUpdate({ _id: new ObjectId(request.body._id) },
                                                  {
                                                            $set:
                                                            {
                                                                      region: request.body.region,
                                                                      fullAddress: request.body.fullAddress,
                                                                      description: request.body.description,
                                                                      isRecentlyBuilt: request.body.isRecentlyBuilt,
                                                                      storiesHigh: request.body.storiesHigh,
                                                                      hasOwnParkingLot: request.body.hasOwnParkingLot,
                                                                      apartmentCount: request.body.apartmentCount,
                                                                      hasOwnElevator: request.body.hasOwnElevator,
                                                                      hasOwnBicycleRoom: request.body.hasOwnBicycleRoom,
                                                                      hasGasHeating: request.body.hasGasHeating,
                                                                      hasCentralHeating: request.body.hasCentralHeating,
                                                                      hasElectricHeating: request.body.hasElectricHeating,
                                                                      hasSolarPower: request.body.hasSolarPower,
                                                                      hasOwnWaterPump: request.body.hasOwnWaterPump,
                                                                      image: request.body.image,
                                                                      lng: request.body.lng,
                                                                      lat: request.body.lat,
                                                                      buildingStatus: request.body.buildingStatus,
                                                                      dateTimeAdded: request.body.stdateTimeAddedreet,
                                                                      dateTimeUpdated: request.body.dateTimeUpdated,
                                                                      tenants: request.body.tenants,
                                                                      tenantMeetings: request.body.tenantMeetings,
                                                                      invoices: request.body.invoices,
                                                                      parkingLots: request.body.parkingLots,
                                                                      board: request.body.board
                                                            }
                                                  })

                                        return response.status(200).json({ message: 'Building successfully updated!' });
                              } catch (error) {
                                        console.log(error);
                              }

                    } else if (request.method === 'DELETE') {

                              const buildingExists = await dbBuildingApartments.findOne({ _id: request.body._id })

                              if (buildingExists === null) {
                                        await dbBuildingApartments.deleteOne({ _id: new ObjectId(request.body._id) }).then(async (dbResponse: any) => {
                                                  try {
                                                            if (dbResponse.acknowledged) {

                                                                      const boardResponse = await fetch(`${apiUrl}/api/boards/board-api`, {
                                                                                method: 'DELETE',
                                                                                headers: {
                                                                                          'Content-Type': 'application/json',
                                                                                          'Access-Control-Allow-Origin': '*',
                                                                                          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                                },
                                                                                body: JSON.stringify(request.body.board)
                                                                      })
                                                                      console.log(boardResponse.statusText);

                                                            }

                                                  } catch (error) {
                                                            console.log(error);
                                                  }
                                        })
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
                    console.log(response.statusCode)
                    await mongoClient.close();
          }
}


