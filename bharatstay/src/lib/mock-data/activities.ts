export interface Activity {
  id: string;
  title: string;
  city: string;
  image: string;
  durationHours: number;
  category: string;
  pricePerPerson: number;
}

export const activities: Activity[] = [
  { id: 'act-1', title: 'Sunset Cruise on Dal Lake', city: 'Srinagar', image: 'snow:🛶', durationHours: 2, category: 'Sightseeing', pricePerPerson: 899 },
  { id: 'act-2', title: 'Scuba Diving at Havelock', city: 'Andaman', image: 'ocean:🤿', durationHours: 3, category: 'Adventure', pricePerPerson: 4499 },
  { id: 'act-3', title: 'Old Delhi Heritage Walk', city: 'Delhi', image: 'heritage:🚶', durationHours: 3, category: 'Heritage', pricePerPerson: 599 },
  { id: 'act-4', title: 'White River Rafting', city: 'Rishikesh', image: 'forest:🚣', durationHours: 2, category: 'Adventure', pricePerPerson: 999 },
  { id: 'act-5', title: 'Backwater Houseboat Day Cruise', city: 'Alleppey', image: 'forest:🛥️', durationHours: 6, category: 'Sightseeing', pricePerPerson: 2499 },
  { id: 'act-6', title: 'Desert Safari & Camel Ride', city: 'Jaisalmer', image: 'desert:🐫', durationHours: 4, category: 'Adventure', pricePerPerson: 1499 },
  { id: 'act-7', title: 'Paragliding at Solang Valley', city: 'Manali', image: 'snow:🪂', durationHours: 1, category: 'Adventure', pricePerPerson: 2999 },
  { id: 'act-8', title: 'Amber Fort Guided Tour', city: 'Jaipur', image: 'desert:🏰', durationHours: 2, category: 'Heritage', pricePerPerson: 699 },
  { id: 'act-9', title: 'Goa Spice Plantation Tour', city: 'Goa', image: 'forest:🌶️', durationHours: 3, category: 'Nature', pricePerPerson: 799 },
  { id: 'act-10', title: 'Munnar Tea Garden Trek', city: 'Munnar', image: 'forest:🍃', durationHours: 4, category: 'Nature', pricePerPerson: 899 },
];
