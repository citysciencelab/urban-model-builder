import '@glint/environment-ember-loose';

export type AdapterHasManyQuery = {
  [key: string]: string | number; // Dynamische Schlüssel für inverseId
} & {
  $sort?: {
    [key: string]: 1 | -1; // Für sortField und sortDirection: asc = 1, desc = -1
  };
};
