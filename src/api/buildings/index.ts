import type { Building } from '@/types/building';
import { applyPagination } from 'src/utils/apply-pagination';
import { deepCopy } from 'src/utils/deep-copy';
import { buildingsAPI } from './data';
import { BuildingFilters } from '@/sections/dashboard/building/building-options';

type GetBuildingsRequest = {
          filters?: {
                    fullAddress?: string;
                    category?: boolean[]
          },
          page?: number,
          rowsPerPage: number,
};

export type GetBuildingsResponse = Promise<{
          data: Building[];
          count: number;
}>;

class BuildingsApi {
          getBuildings(request: GetBuildingsRequest): GetBuildingsResponse {
                    const { filters, page, rowsPerPage } = request;

                    let data = deepCopy(buildings) as Building[];
                    let count = data.length;

                    if (typeof filters !== 'undefined') {
                              data = data.filter((building) => {

                                        if (typeof filters.fullAddress !== 'undefined' && filters.fullAddress !== '') {
                                                  const nameMatched = building.fullAddress.toLowerCase().includes(filters.fullAddress.toLowerCase());

                                                  if (!nameMatched) {
                                                            return false;
                                                  }
                                        }

                                        // It is possible to select multiple category options
                                        if (typeof filters.category !== 'undefined' && filters.category.length > 0) {
                                                  const categoryMatched = filters.category.includes(
                                                            building.isRecentlyBuilt ||
                                                            building.hasCentralHeating || building.hasElectricHeating ||
                                                            building.hasGasHeating || building.hasOwnParkingLot || building.hasSolarPower
                                                  )

                                                  if (!categoryMatched) {
                                                            return false;
                                                  }
                                        }

                                        // // It is possible to select multiple status options
                                        // if (typeof filters.status !== 'undefined' && filters.status.length > 0) {
                                        //           const statusMatched = filters.status.includes(building.status);

                                        //           if (!statusMatched) {
                                        //                     return false;
                                        //           }
                                        // }

                                        // // Present only if filter required
                                        // if (typeof filters.inStock !== 'undefined') {
                                        //           const stockMatched = building.inStock === filters.inStock;

                                        //           if (!stockMatched) {
                                        //                     return false;
                                        //           }
                                        // }

                                        return true;
                              });
                              count = data.length;
                    }

                    if (typeof page !== 'undefined' && typeof rowsPerPage !== 'undefined') {
                              data = applyPagination(data, page, rowsPerPage);
                    }

                    return Promise.resolve({
                              data,
                              count,
                    });
          }
}

export const buildingsApi = new BuildingsApi();
