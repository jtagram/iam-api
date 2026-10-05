/** One `origin -> destination` application pair returned by the connections endpoints. */
export interface ConnectionResponse {
  id: number;
  originApplicationId: number;
  originApplicationName: string;
  destinationApplicationId: number;
  destinationApplicationName: string;
}
