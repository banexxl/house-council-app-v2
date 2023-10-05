import type { Building, buildingAPIResponse } from '@/types/building';
import { subDays, subHours } from 'date-fns';

export const buildingsAPI = () => {

          const getAllBuildings = async (searchState: any): Promise<Building[]> => {
                    try {
                              const response = await fetch('/api/buildings/buildings-api', {
                                        method: 'GET',
                                        headers: {
                                                  'Content-Type': 'application/json',
                                                  'Access-Control-Allow-Origin': '*',
                                                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                        },
                              }).then((response) => {
                                        if (!response.ok) {
                                                  throw new Error('Network response was not ok');
                                        }
                                        return response.json();
                              }).then((data: buildingAPIResponse) => {
                                        console.log('Data of specific type:', data);
                                        return data;
                              }).catch(error => {
                                        console.error('Error:', error.message);
                                        throw error;  // Re-throw the error for further handling if needed
                              })


                              return Promise.resolve(response.data)
                    } catch (error) {
                              console.log(error);
                              return []
                    }
          }

          return {
                    getAllBuildings
          }

}