import { Building } from '@/types/building';
import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next/types'

export default async function handler(request: NextApiRequest, response: NextApiResponse) {

          // const mongoClient = await clientPromise;
          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
          const dbBuildings = mongoClient.db('HouseCouncilAppDB').collection('Buildings')

          try {
                    if (request.method === 'PUT') {

                              try {
                                        await dbBuildings.updateOne({ _id: new ObjectId(request.body.buildingID) },
                                                  {
                                                            $push: { apartmentNumber: request.body.insertedId }
                                                  })

                                        return response.status(200).json({ message: 'Apartment successfully updated!' });
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


