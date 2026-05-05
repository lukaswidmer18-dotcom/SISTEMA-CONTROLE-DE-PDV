export interface RequiredLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const LOCATION_TIMEOUT_MS = 15000;

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Localização obrigatória. Permita o acesso ao GPS do aparelho para continuar.';
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Não foi possível obter sua localização. Verifique se o GPS está ativo e tente novamente.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Tempo esgotado ao buscar localização. Vá para uma área com melhor sinal de GPS e tente novamente.';
  }

  return 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.';
}

export async function getRequiredLocation(): Promise<RequiredLocation> {
  if (!('geolocation' in navigator)) {
    throw new Error('Este navegador não permite capturar localização. Use um celular com GPS para continuar.');
  }

  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    throw new Error('A localização só funciona em conexão HTTPS. Acesse o sistema por um endereço seguro.');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: LOCATION_TIMEOUT_MS,
    });
  }).catch((error: GeolocationPositionError) => {
    throw new Error(getGeolocationErrorMessage(error));
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}
