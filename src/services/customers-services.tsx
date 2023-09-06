'use server'
import { MongoClient, ObjectId } from "mongodb";
import { Customer } from "src/types/customer";

export const customerServices = () => {

          const GetAllCustomers = async () => {

                    const client: any = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)

                    try {
                              const db = client.db('HouseCouncilAppDB');
                              const tenants = await db.collection('Tenants').find({});
                              return tenants
                    } catch (error: any) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getCustomerById = async (_id: any) => {
                    console.log('getCustomerById id=', _id);

                    const client: any = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)

                    try {
                              const db = client.db('HouseCouncilAppDB')
                              let customer: Customer = await db.collection('Tenants').findOne({ _id: new ObjectId(_id) })
                              return customer
                    } catch (error: any) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }


          return {
                    GetAllCustomers,
                    getCustomerById
          }
}