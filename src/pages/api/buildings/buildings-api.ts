import { Building } from '@/types/building';
import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
          const dbBuildings = mongoClient.db('HouseCouncilAppDB').collection('Buildings')

          try {
                    if (request.method === 'GET') {

                              // const page = parseInt(request.query.page as string) // Explicit casting to string
                              // const rowsPerPage = parseInt(request.query.rowsPerPage as string)
                              // const sortBy = request.query.sortBy as string | undefined; // Explicit casting to string or undefined
                              // const sortDir = request.query.sortDir as string | undefined; // Explicit casting to string or undefined
                              // const skip = page * rowsPerPage
                              // const sortOrder = sortDir === 'desc' ? -1 : 1; // Descending (-1) or Ascending (1)

                              const allBuildings = await dbBuildings
                                        .find({})
                                        // .limit(rowsPerPage)
                                        // .sort({ sortBy: sortOrder })
                                        // .skip(skip)
                                        .toArray();

                              const totalCount = allBuildings.length

                              return response.status(200).json({ message: 'Buildings found!', data: dbBuildings, totalCount });

                    } else if (request.method === 'POST') {

                              const buildingExists = await dbBuildings.findOne({ fullAddress: request.body.fullAddress })

                              if (buildingExists === null) {
                                        await dbBuildings.insertOne(request.body).then(async (dbResponse: any) => {
                                                  try {
                                                            if (dbResponse.acknowledged) {

                                                                      const boardResponse = await fetch('http://localhost:3000/api/boards/board-api', {
                                                                                method: 'POST',
                                                                                headers: {
                                                                                          'Content-Type': 'application/json',
                                                                                          'Access-Control-Allow-Origin': '*',
                                                                                          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                                },
                                                                                body: JSON.stringify({
                                                                                          buildingId: dbResponse.insertedId,
                                                                                          columns: [],
                                                                                          tasks: []
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

                              var objectForUpdate: Building = {
                                        street: '',
                                        streetNumber: 0,
                                        city: '',
                                        region: '',
                                        country: '',
                                        fullAddress: '',
                                        description: '',
                                        isRecentlyBuilt: false,
                                        storiesHigh: 0,
                                        hasOwnParkingLot: false,
                                        appartmentCount: 0,
                                        hasOwnElevator: false,
                                        hasOwnBicycleRoom: false,
                                        hasGasHeating: false,
                                        hasCentralHeating: false,
                                        hasElectricHeating: false,
                                        hasSolarPower: false,
                                        hasOwnWaterPump: false,
                                        image: [],
                                        lng: 0,
                                        lat: 0,
                                        buildingStatus: false,
                                        dateTimeAdded: undefined,
                                        dateTimeUpdated: new Date(),
                                        tenants: [],
                                        tenantMeetings: [],
                                        invoices: [],
                                        parkingLots: [],
                                        board: ''
                              }

                              if (request.body.street) objectForUpdate.street = request.body.street;
                              if (request.body.streetNumber) objectForUpdate.streetNumber = request.body.streetNumber;
                              if (request.body.city) objectForUpdate.city = request.body.city;
                              if (request.body.region) objectForUpdate.region = request.body.region;
                              if (request.body.country) objectForUpdate.country = request.body.country;
                              if (request.body.fullAddress) objectForUpdate.fullAddress = request.body.fullAddress;
                              if (request.body.description) objectForUpdate.description = request.body.description;
                              if (request.body.isRecentlyBuilt) objectForUpdate.isRecentlyBuilt = request.body.isRecentlyBuilt;
                              if (request.body.storiesHigh) objectForUpdate.storiesHigh = request.body.storiesHigh;
                              if (request.body.hasOwnParkingLot) objectForUpdate.hasOwnParkingLot = request.body.hasOwnParkingLot;
                              if (request.body.appartmentCount) objectForUpdate.appartmentCount = request.body.appartmentCount;
                              if (request.body.hasOwnElevator) objectForUpdate.hasOwnElevator = request.body.hasOwnElevator;
                              if (request.body.hasOwnBicycleRoom) objectForUpdate.hasOwnBicycleRoom = request.body.hasOwnBicycleRoom;
                              if (request.body.hasGasHeating) objectForUpdate.hasGasHeating = request.body.hasGasHeating;
                              if (request.body.hasCentralHeating) objectForUpdate.hasCentralHeating = request.body.hasCentralHeating;
                              if (request.body.hasElectricHeating) objectForUpdate.hasElectricHeating = request.body.hasElectricHeating;
                              if (request.body.hasSolarPower) objectForUpdate.hasSolarPower = request.body.hasSolarPower;
                              if (request.body.hasOwnWaterPump) objectForUpdate.hasOwnWaterPump = request.body.hasOwnWaterPump;
                              if (request.body.image) objectForUpdate.image = request.body.image;
                              if (request.body.lng) objectForUpdate.lng = request.body.lng;
                              if (request.body.lat) objectForUpdate.lat = request.body.lat;
                              if (request.body.buildingStatus) objectForUpdate.buildingStatus = request.body.buildingStatus;
                              if (request.body.dateTimeAdded) objectForUpdate.dateTimeAdded = request.body.dateTimeAdded;
                              if (request.body.dateTimeUpdated) objectForUpdate.dateTimeUpdated = request.body.dateTimeUpdated;
                              if (request.body.tenants) objectForUpdate.tenants = request.body.tenants;
                              if (request.body.tenantMeetings) objectForUpdate.tenantMeetings = request.body.tenantMeetings;
                              if (request.body.invoices) objectForUpdate.invoices = request.body.invoices;
                              if (request.body.parkingLots) objectForUpdate.parkingLots = request.body.parkingLots;
                              if (request.body.board) objectForUpdate.board = request.body.board;

                              try {
                                        await dbBuildings.findOneAndUpdate({ _id: new ObjectId(request.body._id) },
                                                  {
                                                            $set:
                                                                      objectForUpdate
                                                            // street: request.body.street,
                                                            // streetNumber: request.body.streetNumber,
                                                            // city: request.body.city,
                                                            // region: request.body.region,
                                                            // country: request.body.country,
                                                            // fullAddress: request.body.fullAddress,
                                                            // description: request.body.description,
                                                            // isRecentlyBuilt: request.body.isRecentlyBuilt,
                                                            // storiesHigh: request.body.storiesHigh,
                                                            // hasOwnParkingLot: request.body.hasOwnParkingLot,
                                                            // appartmentCount: request.body.appartmentCount,
                                                            // hasOwnElevator: request.body.hasOwnElevator,
                                                            // hasOwnBicycleRoom: request.body.hasOwnBicycleRoom,
                                                            // hasGasHeating: request.body.hasGasHeating,
                                                            // hasCentralHeating: request.body.hasCentralHeating,
                                                            // hasElectricHeating: request.body.hasElectricHeating,
                                                            // hasSolarPower: request.body.hasSolarPower,
                                                            // hasOwnWaterPump: request.body.hasOwnWaterPump,
                                                            // image: request.body.image,
                                                            // lng: request.body.lng,
                                                            // lat: request.body.lat,
                                                            // buildingStatus: request.body.buildingStatus,
                                                            // dateTimeAdded: request.body.stdateTimeAddedreet,
                                                            // dateTimeUpdated: request.body.dateTimeUpdated,
                                                            // tenants: request.body.tenants,
                                                            // tenantMeetings: request.body.tenantMeetings,
                                                            // invoices: request.body.invoices,
                                                            // parkingLots: request.body.parkingLots,
                                                            // board: request.body.board,

                                                  })
                                        return response.status(200).json({ message: 'Customer successfully updated!' });
                              } catch (error) {
                                        console.log(error);
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


