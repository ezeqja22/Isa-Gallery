export type GalleryView = "overview" | "room1" | "room2";

export type RoomView = "room1" | "room2";

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

type RoomConfig = {
  id: RoomView;
  position: [number, number, number];
  camera: CameraViewConfig;
};

export type ViewportMode = "desktop" | "mobile";

export const OVERVIEW_CAMERAS: Record<ViewportMode, CameraViewConfig> = {
  desktop: {
    position: {
      x: 7.5,
      y: 0,
      z: 15,
    },

    target: {
      x: 7.5,
      y: 0,
      z: 0,
    },

    duration: 1.6,
  },

  mobile: {
    position: {
      x: 7.5,
      y: 0,
      z: 22,
    },

    target: {
      x: 7.5,
      y: 0,
      z: 0,
    },

    duration: 1.6,
  },
};

export const ROOMS: Record<RoomView, RoomConfig> = {
  room1: {
    id: "room1",

    position: [0, 0, 0],

    camera: {
      position: {
        x: 0,
        y: 0,
        z: 2,
      },

      target: {
        x: 0,
        y: 0,
        z: -4.5,
      },

      duration: 1.8,
    },
  },

  room2: {
    id: "room2",

    position: [15, 0, 0],

    camera: {
      position: {
        x: 15,
        y: 0,
        z: 2,
      },

      target: {
        x: 15,
        y: 0,
        z: -4.5,
      },

      duration: 1.8,
    },
  },
};
