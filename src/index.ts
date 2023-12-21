import {
  $update,
  $query,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the FoodItem type
type FoodItem = Record<{
  id: string;
  name: string;
  quantity: number;
  expirationDate: string;
  ownerId: Principal;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the FoodItemPayload type for creating or updating food items
type FoodItemPayload = Record<{
  name: string;
  quantity: number;
  expirationDate: string;
}>;

// Create StableBTreeMap to store food items
const foodItemStorage = new StableBTreeMap<string, FoodItem>(0, 44, 1024);

// Shared list to store excess food items
const sharedCommunityList: FoodItem[] = [];

// Function to create a new food item
$update;
export function createFoodItem(payload: FoodItemPayload): Result<FoodItem, string> {
  // Payload Validation: Ensure that required fields are present in the payload
  if (!payload.name || !payload.quantity || !payload.expirationDate) {
    return Result.Err<FoodItem, string>("Invalid payload");
  }

  // Input Validation: Ensure that quantity is greater than zero
  if (payload.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  // Create a new food item record
  const foodItem: FoodItem = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ownerId: ic.caller(),
    name: payload.name,
    quantity: payload.quantity,
    expirationDate: payload.expirationDate,
  };

  // Check for duplicate item by ID
  const existingFoodItem = foodItemStorage.get(foodItem.id);
  if (existingFoodItem) {
    return Result.Err<FoodItem, string>("Food item with the same id already exists");
  }

  try {
    foodItemStorage.insert(foodItem.id, foodItem);
    return Result.Ok<FoodItem, string>(foodItem);
  } catch (error) {
    return Result.Err<FoodItem, string>("Failed to create food item");
  }
}

// Function to get a food item by ID
$query;
export function getFoodItemById(id: string): Result<FoodItem, string> {
  // Parameter Validation: Validate the id parameter to ensure it's a valid string
  if (typeof id !== 'string') {
    return Result.Err<FoodItem, string>('Invalid ID parameter.');
  }

  return match(foodItemStorage.get(id), {
    Some: (item) => Result.Ok<FoodItem, string>(item),
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

// Function to get all food items with a given name
$query;
export function getFoodItemsByName(name: string): Result<Vec<FoodItem>, string> {
  try {
    // Parameter Validation: Ensure that name is a non-empty string
    if (typeof name !== 'string' || name.trim() === '') {
      return Result.Err('Invalid name');
    }

    // Filter items by name and return the result
    const matchingItems = foodItemStorage.values().filter((item) => item.name.toLowerCase() === name.toLowerCase());
    return Result.Ok(matchingItems);
  } catch (error) {
    return Result.Err("An error occurred while retrieving food items by name.");
  }
}

// Function to get all food items
$query;
export function getAllFoodItems(): Result<Vec<FoodItem>, string> {
  try {
    // Return all food items
    return Result.Ok(foodItemStorage.values());
  } catch (error) {
    return Result.Err(`Error retrieving food items: ${error}`);
  }
}

// Function to update a food item
$update;
export function updateFoodItem(id: string, payload: FoodItemPayload): Result<FoodItem, string> {
  // Payload Validation: Ensure that required fields are present in the payload
  if (!payload.name || !payload.quantity || !payload.expirationDate) {
    return Result.Err<FoodItem, string>("Invalid payload");
  }

  return match(foodItemStorage.get(id), {
    Some: (existingItem) => {
      // Selective Update: Update only the allowed fields in updatedItem
      const updatedItem: FoodItem = {
        ...existingItem,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        foodItemStorage.insert(updatedItem.id, updatedItem);
        return Result.Ok<FoodItem, string>(updatedItem);
      } catch (error) {
        return Result.Err<FoodItem, string>(`Failed to update Food Item with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

// Function to delete a food item by ID
$update;
export function deleteFoodItem(id: string): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (existingItem) => {
      // Remove the item from the storage
      foodItemStorage.remove(id);
      return Result.Ok<FoodItem, string>(existingItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

// Function to share excess food with the community
$update;
export function shareExcessFood(id: string): Result<FoodItem, string> {
  // Parameter Validation: Ensure that ID is provided
  if (!id) {
    return Result.Err<FoodItem, string>("Invalid ID provided.");
  }

  return match(foodItemStorage.get(id), {
    Some: (foodItem) => {
      // Remove the item from the storage
      foodItemStorage.remove(id);

      // Add the item to the shared community list
      sharedCommunityList.push(foodItem);

      // Log the shared item
      console.log(`Shared: Food item "${foodItem.name}" has been shared with the community!`);

      return Result.Ok<FoodItem, string>(foodItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

// Function to get all shared food items
$query;
export function getAllSharedFoodItems(): Result<Vec<FoodItem>, string> {
  try {
    // Fetch sharedCommunityList
    return Result.Ok(sharedCommunityList);
  } catch (error) {
    // Handle error
    return Result.Err("Failed to fetch shared food items");
  }
}

// Cryptographic utility for generating random values
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};


