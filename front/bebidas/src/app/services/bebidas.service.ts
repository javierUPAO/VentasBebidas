import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UpdateRequest } from '../models/update';

@Injectable({
  providedIn: 'root',
})
export class BebidasService {
  private url = 'http://localhost:4000/';

  constructor(private http: HttpClient) {}

  obtenerBebidas(filtros: any) {
    const query = `
query Bebidas(
  $type: BeverageType
  $brand: String
  $minSales: Int
  $sortBy: Sort
) {
  bebidas(
    type: $type
    brand: $brand
    minSales: $minSales
    sortBy: $sortBy
  ) {
    result {
      id
      brand
      type
      sales
      count
      month
      goal
      succes
    }
    total
    cantidad
  }
}
`;
    const variables: any = {};

    if (filtros.type) {
      variables.type = filtros.type;
    }

    if (filtros.brand) {
      variables.brand = filtros.brand;
    }

    if (filtros.minSales) {
      variables.minSales = filtros.minSales;
    }

    if (filtros.sortBy) {
      variables.sortBy = filtros.sortBy;
    }

    return this.http.post<any>(this.url, {
      query,
      variables,
    });
  }

  actualizarBebida(updateBebidaId: string, input: UpdateRequest) {
    const query = `
      mutation UpdateBebida($updateBebidaId: ID!, $input: UpdateInput!) {
        updateBebida(id: $updateBebidaId, input: $input) {
          bebida {
            id
            brand
            type
            sales
            count
            month
          }
        }
      }
      `;
    const variables = {
      updateBebidaId,
      input,
    };
    console.log(variables);
    return this.http.post<any>(this.url, {
      query,
      variables,
    });
  }

  crearBebida(input: any) {
    const query = `
    mutation addBebida($input: BebidaInput!) {
      addBebida(input: $input) {
      bebida{
          brand
          type
          sales
          count
          month
        }
      }
    }
  `;

    return this.http.post<any>(this.url, {
      query,
      variables: { input },
    });
  }

  borrarBebida(deleteBebidaId: any) {
    const query = `mutation Mutation($deleteBebidaId: ID!) {
                    deleteBebida(id: $deleteBebidaId) {
                      message
                    }
                    }`;
    return this.http.post<number>(this.url, {
      query,
      variables: { deleteBebidaId },
    });
  }
}
