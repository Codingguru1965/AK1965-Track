import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkCallback = (isConnected: boolean, isInternetReachable: boolean | null) => void;

class NetworkMonitor {
  private isOnlineStatus: boolean = true;
  private isReachableStatus: boolean | null = true;
  private listeners: Set<NetworkCallback> = new Set();

  constructor() {
    NetInfo.addEventListener((state: NetInfoState) => {
      this.isOnlineStatus = Boolean(state.isConnected);
      this.isReachableStatus = state.isInternetReachable;
      this.notifyListeners();
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      this.isOnlineStatus = Boolean(state.isConnected);
      this.isReachableStatus = state.isInternetReachable;
    });
  }

  public get isConnected(): boolean {
    return this.isOnlineStatus;
  }

  public get isInternetReachable(): boolean | null {
    return this.isReachableStatus;
  }

  public async checkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnlineStatus = Boolean(state.isConnected);
    this.isReachableStatus = state.isInternetReachable;
    return this.isOnlineStatus;
  }

  public subscribe(callback: NetworkCallback): () => void {
    this.listeners.add(callback);
    // Emit immediate current state
    callback(this.isOnlineStatus, this.isReachableStatus);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      callback(this.isOnlineStatus, this.isReachableStatus);
    });
  }
}

export const networkMonitor = new NetworkMonitor();
