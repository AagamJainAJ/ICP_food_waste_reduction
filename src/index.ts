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

type FoodItem = Record<{
  id: string;
  name: string;
  quantity: number;
  expirationDate: nat64;
  ownerId: Principal;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;


type FoodItemPayload = Record<{
  name: string;
  quantity: number;
  expirationDate: nat64;
}>;

const foodItemStorage = new StableBTreeMap<string, FoodItem>(0, 44, 1024);

const sharedCommunityList: FoodItem[] = [];

$update;
export function createFoodItem(payload: FoodItemPayload): Result<FoodItem, string> {
  const foodItem: FoodItem = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ownerId: ic.caller(),
    ...payload,
  };

  foodItemStorage.insert(foodItem.id, foodItem);
  return Result.Ok<FoodItem, string>(foodItem);
}


$query;
export function getFoodItemById(id: string): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (item) => Result.Ok<FoodItem, string>(item),
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

$query;
export function getFoodItemsByName(name: string): Result<Vec<FoodItem>, string> {
  const matchingItems = foodItemStorage.values().filter((item) => item.name.toLowerCase() === name.toLowerCase());
  return Result.Ok(matchingItems);
}

$query;
export function getAllFoodItems(): Result<Vec<FoodItem>, string> {
  const currentUserId = ic.caller();
  const userFoodItems = foodItemStorage.values().filter((item) => item.ownerId === currentUserId);
  return Result.Ok(userFoodItems);
}

$update;
export function updateFoodItem(id: string, payload: FoodItemPayload): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (existingItem) => {
      const updatedItem: FoodItem = {
        ...existingItem,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      foodItemStorage.insert(updatedItem.id, updatedItem);
      return Result.Ok<FoodItem, string>(updatedItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

$update;
export function deleteFoodItem(id: string): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (existingItem) => {
      foodItemStorage.remove(id);
      return Result.Ok<FoodItem, string>(existingItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

$update;
export function shareExcessFood(id: string): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (foodItem) => {
      foodItemStorage.remove(id);

      sharedCommunityList.push(foodItem);


      return Result.Ok<FoodItem, string>(foodItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

$query;
export function getAllSharedFoodItems(): Result<Vec<FoodItem>, string> {
  return Result.Ok(sharedCommunityList);
}

// ...

$update;
export function updateFoodItemQuantity(id: string, newQuantity: number): Result<FoodItem, string> {
  return match(foodItemStorage.get(id), {
    Some: (existingItem) => {
      const updatedItem: FoodItem = {
        ...existingItem,
        quantity: newQuantity,
        updatedAt: Opt.Some(ic.time()),
      };

      foodItemStorage.insert(updatedItem.id, updatedItem);
      return Result.Ok<FoodItem, string>(updatedItem);
    },
    None: () => Result.Err<FoodItem, string>(`Food Item with ID=${id} not found.`),
  });
}

$query;
export function getFoodItemsByQuantity(minQuantity: number, maxQuantity: number): Result<Vec<FoodItem>, string> {
  const matchingItems = foodItemStorage.values().filter(
    (item) => item.quantity >= minQuantity && item.quantity <= maxQuantity
  );
  return Result.Ok(matchingItems);
}

// ...


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
