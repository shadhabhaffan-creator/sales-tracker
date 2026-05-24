export const fakeDB = {
  get(key: string) {
    if (typeof window === 'undefined') return [];

    try {
      return JSON.parse(
        localStorage.getItem(key) || '[]'
      );
    } catch (err) {
      console.error('DB read error:', err);
      return [];
    }
  },

  save(key: string, data: any[]) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(data)
      );
    } catch (err) {
      console.error('DB save error:', err);
    }
  },

  add(key: string, item: any) {
    const items = this.get(key);

    const newItem = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...item
    };

    items.push(newItem);

    this.save(key, items);

    return newItem;
  },

  update(key: string, id: number, data: any) {
    const items = this.get(key).map(
      (item: any) =>
        item.id === id
          ? {
              ...item,
              ...data,
              updatedAt:
                new Date().toISOString()
            }
          : item
    );

    this.save(key, items);

    return items;
  },

  remove(key: string, id: number) {
    const items = this
      .get(key)
      .filter(
        (item: any) =>
          item.id !== id
      );

    this.save(key, items);

    return items;
  },

  clear(key: string) {
    localStorage.removeItem(key);
  },

  clearAll() {
    localStorage.clear();
  }
};