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

/*
  The overview camera remains physically
  between the two rooms.

  Room 1 now occupies approximately:
  X = -10 → +10

  Room 2 will occupy:
  X = 20 → 30

  So the gap between them is:
  X = 10 → 20

  X = 12.5 still gives us a nice
  Pasqua-style between-the-rooms viewpoint.
*/
export const OVERVIEW_CAMERAS: Record<ViewportMode, CameraViewConfig> = {
  desktop: {
    position: {
      x: 12.5,
      y: 0,
      z: 28,
    },

    target: {
      x: 12.5,
      y: 0,
      z: 0,
    },

    duration: 1.8,
  },

  mobile: {
    position: {
      x: 12.5,
      y: 0,
      z: 42,
    },

    target: {
      x: 12.5,
      y: 0,
      z: 0,
    },

    duration: 1.8,
  },
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
      /*
        The floor is now around Y = -4.

        Y = -2 gives us roughly a
        human eye-level camera.
      */
      position: {
        x: 0,
        y: -2,
        z: 5,
      },

      /*
        Look deep toward the back wall,
        which is now around Z = -10.
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

    /*
      Move Room 2 farther right so it no
      longer collides with enlarged Room 1.
    */
    position: [25, 0, 0],

    dimensions: {
      width: 10,
      depth: 10,
      height: 5,
    },

    camera: {
      position: {
        x: 25,
        y: 0,
        z: 2,
      },

      target: {
        x: 25,
        y: 0,
        z: -4.5,
      },

      duration: 1.8,
    },
  },
};
