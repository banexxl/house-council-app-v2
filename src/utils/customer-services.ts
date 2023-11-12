import { MongoClient } from "mongodb"
import { ObjectId } from "mongodb"

export const customersServices = () => {

          const getAllCustomers = async () => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    const db = client.db('HouseCouncilAppDB')
                    try {
                              let data = await db.collection('Tenants').find({}).toArray()
                              return data
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getAllOwners = async () => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    const db = client.db('HouseCouncilAppDB')
                    try {
                              let data = await db.collection('Tenants').find({ isOwner: true }).toArray()
                              return data
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getAllBuildingIDs = async () => {

                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)

                    try {
                              const db = client.db('HouseCouncilAppDB')
                              let data = await db.collection('Buildings').distinct('_id')
                              return data
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getbuildingAddressByBuildingID = async (buildingID: string) => {

                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)

                    try {
                              const db = client.db('HouseCouncilAppDB')
                              let collection = await db.collection('Buildings')
                              const document = await collection.findOne({ _id: new ObjectId(buildingID) });

                              if (document) {
                                        const buildingAddress = document.buildingAddress;
                                        return buildingAddress
                              } else {
                                        console.log('Document not found with the provided _id.');
                              }
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductById = async (_id: any) => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let product = await db.collection('Products').findOne({ _id: new ObjectId(_id) })
                              return product
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByManufacturer = async (manufacturer: any) => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products').find({ "manufacturer": `${manufacturer}` }).toArray()
                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByNameAndOrManufacturer = async (searchTerm: any) => {

                    const searchTermArray = searchTerm.split(" ")

                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products')
                                        .find({
                                                  $or: [
                                                            { "name": { $regex: `${searchTermArray[0]}`, $options: 'i' } },
                                                            { "manufacturer": { $regex: `${searchTermArray[0]}`, $options: 'i' } },
                                                            { "name": { $regex: `${searchTermArray[1]}`, $options: 'i' } },
                                                            { "manufacturer": { $regex: `${searchTermArray[1]}`, $options: 'i' } },
                                                  ]
                                        }
                                        ).toArray()

                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByDiscount = async () => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products').find({ discount: true }).toArray()

                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByMainCategory = async (mainCategory: any) => {

                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products').find({ mainCategory: `${mainCategory}` }).toArray()
                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByMainCategoryMidCategory = async (mainCategory: any, midCategory: any) => {

                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products').find({ mainCategory: mainCategory, midCategory: midCategory }).toArray()
                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getProductsByMainCategoryMidCategorySubCategory = async (mainCategory: any, midCategory: any, subCategory: any) => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)
                    try {
                              const db = client.db('DAR_DB')
                              let products = await db.collection('Products').find({ mainCategory: mainCategory, midCategory: midCategory, subCategory: subCategory }).toArray()
                              return products
                    } catch (error) {
                              return { message: error.message }
                    }
                    finally {
                              await client.close();
                    }
          }

          const getAllManufacturers = async () => {
                    const client = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!)

                    try {
                              await client.connect();
                              const db = client.db('DAR_DB');
                              const productsCollection = db.collection('Products');

                              const manufacturers = await new Promise((resolve, reject) => {
                                        productsCollection.distinct("manufacturer", (error: any, manufacturers: any) => {
                                                  if (error) {
                                                            reject(error);
                                                  } else {
                                                            resolve(manufacturers);
                                                  }
                                        });
                              });
                              return manufacturers;
                    } catch (error) {
                              return { message: error };
                    } finally {
                              client.close();
                    }
          }


          return {
                    getAllCustomers,
                    getAllBuildingIDs,
                    getAllOwners,
                    getProductsByNameAndOrManufacturer,
                    getProductsByManufacturer,
                    getProductsByDiscount,
                    getProductsByMainCategory,
                    getProductsByMainCategoryMidCategory,
                    getProductsByMainCategoryMidCategorySubCategory,
                    getbuildingAddressByBuildingID,
                    getAllManufacturers
          }
}