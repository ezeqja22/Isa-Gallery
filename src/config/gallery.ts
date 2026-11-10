export type GalleryView = "overview" | "room1" | "room2";
export type RoomView = "room1" | "room2";
export type ViewportMode = "desktop" | "mobile";

type Vector3Config = {
  x: number;
  y: number;
  z: number;
};

type CameraViewConfig = {
  position: Vector3Config;
  target: Vector3Config;
  duration: number;
};

export type RoomDimensions = {
  width: number;
  depth: number;
  height: number;
};

type RoomConfig = {
  id: RoomView;
  position: [number, number, number];
  dimensions: RoomDimensions;
  camera: CameraViewConfig;
};

/**
 * Overview camera sits between the two rooms.
 *
 * Room 1:
 * X = -10 → +10
 *
 * Room 2:
 * X = 20 → 30
 *
 * The overview remains around X = 12.5.
 */
export const OVERVIEW_CAMERAS: Record<ViewportMode, CameraViewConfig> = {
 desktop: { position: {x:0,y:-.5,z:21}, target:{x:0,y:-.3,z:-7}, duration:3.2 },
 mobile: { position: {x:0,y:-.5,z:21}, target:{x:0,y:-.3,z:-7}, duration:3.2 },
};

export const ROOMS: Record<RoomView, RoomConfig> = {
  room1: {
    id: "room1",

    position: [0, 0, 0],

    dimensions: {
      width: 20,
      depth: 20,
      height: 8,
    },

    camera: {
      /**
       * Room floor is around Y = -4.
       * Y = -2 gives us approximately
       * human eye level.
       *
       * Z was previously 5.
       * Moving to 2.2 places the camera
       * farther inside the gallery.
       */
      position: {
        x: 0,
        y: -0.5,
        z: 2.2,
      },

      /**
       * Continue looking toward the
       * center of the back wall.
       */
      target: {
        x: 0,
        y: -0.5,
        z: -9.5,
      },

      duration: 1.8,
    },
  },

  room2: {
    id: "room2",

    position: [27, 2.8, 0],

    dimensions: {
      width: 24,
      depth: 22,
      height: 8,
    },

    camera: {
      position: {
        x: 18.3,
        y: 0.9,
        z: -4.0,
      },

      target: {
        x: 28,
        y: 0.9,
        z: 1.5,
      },

      duration: 1.8,
    },
  },
};
