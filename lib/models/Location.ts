export interface Location {
  id?: string;
  address?: string;
  neighborhood?: string;
}

export function locationFromFirestore(data: any): Location {
  return {
    id: data.id,
    address: data.address,
    neighborhood: data.neighborhood,
  };
}

export function displayNeighborhood(location: Location): string {
  if (location.neighborhood && location.neighborhood.trim().length > 0) {
    return location.neighborhood;
  }
  return location.address || "";
}

export function displayAddress(location: Location): string {
  return location.address || "";
}

