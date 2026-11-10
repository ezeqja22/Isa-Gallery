export type ArtworkId = "piktura1" | "piktura2" | "piktura4";

export type Artwork = {
  id: ArtworkId;

  /**
   * Image shown inside the inspection view.
   */
  image: string;

  /**
   * Display information shown below the painting.
   */
  title: string;
  description: string;
  /** Optional label lines, e.g. artist, year, medium, or dimensions. */
  details?: string[];

  /**
   * Actual physical dimensions of the artwork.
   */
  dimensions: {
    widthCm: number;
    heightCm: number;
  };

  /**
   * Blender object names that represent this artwork.
   *
   * There can be more than one because the same painting
   * may appear in multiple places in the gallery.
   */
  objectNames: string[];
};

export const ARTWORKS: Record<ArtworkId, Artwork> = {
  piktura1: {
    id: "piktura1",

    image: "/paintings/piktura1.jpeg",

    title: "Ocean",
    description: "Artwork description will be added here.",

    dimensions: {
      widthCm: 100,
      heightCm: 80,
    },

    objectNames: ["Frame_Hero_Thin_Artwork"],
  },

  piktura2: {
    id: "piktura2",

    image: "/paintings/piktura2.jpeg",

    title: "Coastal Landscape",
    description: "Artwork description will be added here.",

    dimensions: {
      widthCm: 90,
      heightCm: 80,
    },

    objectNames: [
      // Original painting on the back wall
      "Backwall_Left_Artwork",

      // Large duplicate on the right wall
      "RightWall_Big_Piktura2_Art",
    ],
  },

  piktura4: {
    id: "piktura4",

    image: "/paintings/piktura4.jpeg",

    title: "Mountain Landscape",
    description: "Artwork description will be added here.",

    dimensions: {
      widthCm: 90,
      heightCm: 80,
    },

    objectNames: ["Backwall_Right_Artwork"],
  },
};

/**
 * Lets RoomModel take a Blender object name and determine
 * which artwork the user clicked.
 *
 * Example:
 *
 * "Backwall_Left_Artwork"
 *          ↓
 *      piktura2
 */
export function findArtworkByObjectName(objectName: string): Artwork | null {
  for (const artwork of Object.values(ARTWORKS)) {
    if (artwork.objectNames.includes(objectName)) {
      return artwork;
    }
  }

  return null;
}

