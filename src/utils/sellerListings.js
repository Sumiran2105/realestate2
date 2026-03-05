import { listingApi } from './apiClient';

export const resetSellerListings = async () => {
  throw new Error('Reset operation is not supported with API storage');
};

export const getSellerListings = async (sellerId) => {
  if (!sellerId) return [];
  const response = await listingApi.getBySeller(sellerId);
  return response.listings || [];
};

export const saveSellerListings = async () => {
  throw new Error('Bulk save is not supported with API storage');
};

export const appendSellerListing = async (sellerId, listing) => {
  if (!sellerId) {
    throw new Error('Seller ID is required');
  }

  await listingApi.create(listing);
  return getSellerListings(sellerId);
};

export const getSellerListingById = async (sellerId, listingId) => {
  if (!sellerId || !listingId) return null;

  const response = await listingApi.getById(listingId);
  const listing = response.listing || null;
  if (!listing) return null;
  return String(listing.sellerId) === String(sellerId) ? listing : null;
};

export const updateSellerListing = async (sellerId, listingId, updates) => {
  if (!sellerId || !listingId) {
    throw new Error('Seller ID and listing ID are required');
  }

  await listingApi.update(listingId, updates);
  return getSellerListings(sellerId);
};

export const deleteSellerListing = async (sellerId, listingId) => {
  if (!sellerId || !listingId) {
    throw new Error('Seller ID and listing ID are required');
  }

  await listingApi.remove(listingId);
  return getSellerListings(sellerId);
};

export const getAllSellerListings = async () => {
  const response = await listingApi.getAll();
  return response.listings || [];
};

export const getSellerListingByIdFromAll = async (listingId) => {
  if (!listingId) return null;
  const response = await listingApi.getById(listingId);
  return response.listing || null;
};
