export interface Recipe {
  id?: string;
  name: string;
  description?: string;
  ingredients?: string[];
  country?: string;
  servingSize?: string;
  costPerServing?: string;
  imageURL?: string;
  author?: string;
  cookbook?: string;
  url?: string;
  tags?: string[];
}

export function recipeFromFirestore(data: any): Recipe {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    ingredients: data.ingredients,
    country: data.country,
    servingSize: data.servingSize,
    costPerServing: data.costPerServing,
    imageURL: data.imageURL,
    author: data.author,
    cookbook: data.cookbook,
    url: data.url,
    tags: data.tags,
  };
}

