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

                                                                      const boardResponse = await fetch('https://house-council-app-v2.vercel.app/api/boards/board-api', {
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

                              try {
                                        await dbBuildings.findOneAndUpdate({ _id: new ObjectId(request.body._id) },
                                                  {
                                                            $set:
                                                                      { board: request.body.board }
                                                  })

                                        return response.status(200).json({ message: 'Building successfully updated!' });
                              } catch (error) {
                                        console.log(error);
                              }

                    } else if (request.method === 'DELETE') {
                              const buildingExists = await dbBuildings.findOne({ _id: request.body._id })

                              if (buildingExists === null) {
                                        await dbBuildings.deleteOne({ _id: new ObjectId(request.body._id) }).then(async (dbResponse: any) => {
                                                  try {
                                                            if (dbResponse.acknowledged) {

                                                                      const boardResponse = await fetch('https://house-council-app-v2.vercel.app//api/boards/board-api', {
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


