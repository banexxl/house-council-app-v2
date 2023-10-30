import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
          const collectionBoards = mongoClient.db('HouseCouncilAppDB').collection('Boards')

          const apiUrl = process.env.NODE_ENV === 'development' ?
                    process.env.NEXT_DEV_URL : process.env.NEXT_VERCEL_DEV_URL

          try {
                    if (request.method === 'GET') {

                              const board = await collectionBoards.find(request.body._id).toArray();

                              return response.status(200).json({ message: 'Board found!', data: board });

                    } else if (request.method === 'POST') {

                              await collectionBoards.insertOne(request.body).then(async (createBoardResponse: any) => {

                                        if (createBoardResponse.acknowledged) {

<<<<<<< HEAD
                                                  const modifyBuildingResponse = await fetch('https://house-council-app-v2.vercel.app/api/buildings/buildings-api', {
=======
                                                  const modifyBuildingResponse = await fetch(`${apiUrl}/api/buildings/buildings-api`, {
>>>>>>> d52692a8444e869d8b6471eeec1dc4de32c2bbc8
                                                            method: 'PUT',
                                                            headers: {
                                                                      'Content-Type': 'application/json',
                                                                      'Access-Control-Allow-Origin': '*',
                                                                      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                            },
                                                            body: JSON.stringify({
                                                                      board: createBoardResponse.insertedId,
                                                                      _id: request.body.buildingId
                                                            })
                                                  })
                                        }

                              })
                              return response.status(200).json({ message: 'Board added successfully' })
                              // if (buildingExists === null) {
                              //           await collectionBoards.insertOne(request.body)
                              //           return response.status(200).json({ message: 'Building successfully added!' });
                              // } else {
                              //           const error = new Error('Building already exists!');
                              //           (error as any).cause = { status: 409 };
                              //           return response.status(409).json({ error: error });
                              // }
                    } else if (request.method === 'DELETE') {
                              const deleteBoardResponse = await collectionBoards.deleteOne({ _id: new ObjectId(request.body) })

                              // ovde pozvati brisanje poveznice za board, verovatno columns
                              // .then(async (createBoardResponse: any) => {

                              // if (createBoardResponse.acknowledged) {

                              //           const modifyBuildingResponse = await fetch('http://localhost:3000/api/buildings/buildings-api', {
                              //                     method: 'DELETE',
                              //                     headers: {
                              //                               'Content-Type': 'application/json',
                              //                               'Access-Control-Allow-Origin': '*',
                              //                               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                              //                     },
                              //                     body: JSON.stringify({
                              //                               board: createBoardResponse.insertedId,
                              //                               _id: request.body.buildingId
                              //                     })
                              //           })
                              // }

                              // })
                              return response.status(200).json({ message: 'Board deleted successfully' })
                              // if (buildingExists === null) {
                              //           await collectionBoards.insertOne(request.body)
                              //           return response.status(200).json({ message: 'Building successfully added!' });
                              // } else {
                              //           const error = new Error('Building already exists!');
                              //           (error as any).cause = { status: 409 };
                              //           return response.status(409).json({ error: error });
                              // }
                    }
          } catch (error) {
                    return response.status(500).json({ error: 'Internal server error!' });
          } finally {
                    console.log(response.statusCode)
                    await mongoClient.close();
          }
}


