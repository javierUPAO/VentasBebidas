import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Column } from '@antv/g2plot';
import { FirebaseAuthService } from '../Guards/firebase-auth.service';
import { Router } from '@angular/router';
import { BebidasService } from '../services/bebidas.service';
import { UpdateRequest } from '../models/update';
import { Bebida } from '../models/bebida';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  chart!: Column;
  tipoBebida: string = 'Todas';
  marca: string = 'Todas';
  total: number = 0;
  cantidad: number = 0;
  pendingUpdates = new Set<string>();
  constructor(
    private auth: FirebaseAuthService,
    private router: Router,
    private bebidasService: BebidasService
  ) {}

  ngOnInit(): void {}

  logout() {
    this.auth.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
  marcasDisponibles: string[] = [];

  filtros = {
    type: null,
    brand: null,
  };
  datos: any[] = [];

  ngAfterViewInit(): void {
    this.onTipoChange('Todas');
    this.cargarDatos();
  }

  cargarDatos() {
    this.filtros.type = this.mapTipo(this.tipoBebida);
    this.filtros.brand = this.marca !== 'Todas' ? this.marca : null;
    this.bebidasService.obtenerBebidas(this.filtros).subscribe((res) => {
      this.datos = res.data.bebidas.result;
      console.log(this.datos);
      this.total = res.data.bebidas.total;
      this.cantidad = res.data.bebidas.cantidad;
      this.crearGrafico(this.datos);
    });
  }

  crearGrafico(data: any[]): void {
    const hayMarca = this.filtros.brand !== null;
    if (this.chart) this.chart.destroy();
    if (!hayMarca) {
      const dataAgrupada = this.agruparPorMarca(data);
      this.chart = new Column('container', {
        data: dataAgrupada,
        xField: 'brand',
        yField: 'sales',
        seriesField: 'brand',
        padding: 'auto',
      });
    } else {
      this.chart = new Column('container', {
        data: this.datos.sort((a, b) => a.month.localeCompare(b.month)),
        xField: 'month',
        yField: 'sales',
        seriesField: 'month',
        isGroup: true,
      });
    }
    this.chart.render();
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  mapTipo(tipo: string) {
    if (tipo === 'Aguas') return 'WATER';
    if (tipo === 'Gaseosas') return 'COLA';
    return null;
  }

  cargarMarcasPorTipo(tipo: string | null) {
    this.bebidasService
      .obtenerBebidas({
        type: tipo,
        brand: null,
      })
      .subscribe((res) => {
        const bebidas = res.data.bebidas.result as any[];

        this.marcasDisponibles = [
          ...new Set(bebidas.map((b) => b.brand as string)),
        ];
      });
  }

  onTipoChange(tipo: string) {
    this.tipoBebida = tipo;
    this.marca = 'Todas';

    const tipoEnum = this.mapTipo(tipo);

    this.cargarMarcasPorTipo(tipoEnum);

    this.cargarDatos();
  }

  onMarcaChange(marca: string) {
    this.marca = marca;
    this.cargarDatos();
  }

  agruparPorMarca(data: any[]) {
    const map = new Map<string, number>();

    data.forEach((d) => {
      map.set(d.brand, (map.get(d.brand) || 0) + d.sales);
    });

    return Array.from(map.entries()).map(([brand, sales]) => ({
      brand,
      sales,
    }));
  }

  originalValues = new Map<string, any>();

  onFocus(bebida: any, field: string) {
    this.originalValues.set(`${bebida.id}-${field}`, bebida[field]);
  }
  onBlur(bebida: any, field: string) {
    this.checkAndUpdate(bebida, field);
  }

  onEnter(event: KeyboardEvent, bebida: any, field: string) {
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  checkAndUpdate(bebida: any, field: string) {
    const key = `${bebida.id}-${field}`;
    const original = this.originalValues.get(key);
    const current = bebida[field];
    console.log('key:' + key, 'original :' + original + 'current :' + current);
    const isSame =
      typeof original === 'number'
        ? Number(original) === Number(current)
        : original === current;

    if (isSame) return;

    if (this.pendingUpdates.has(key)) return;

    this.pendingUpdates.add(key);
    console.log(field);
    const input: UpdateRequest = {
      [field]: current,
    };
    console.log(input);
    this.bebidasService.actualizarBebida(bebida.id, input).subscribe({
      next: () => {
        this.crearGrafico(this.datos);
      },
      error: () => {
        bebida[field] = original;
      },
      complete: () => {
        this.pendingUpdates.delete(key);
        this.crearGrafico(this.datos);
      },
    });
  }

  addRow(bebida: Bebida, index: number) {
    const newRow: Bebida = {
      brand: bebida.brand,
      type: bebida.type,
      sales: undefined,
      count: undefined,
      month: '',
      isNew: true,
    };

    this.datos.splice(index + 1, 0, newRow);
  }
  checkCreate(bebida: Bebida) {
    if (bebida.sales == null || bebida.count == null || !bebida.month) {
      return;
    }

    if (!bebida.isNew) return;

    const input = {
      brand: bebida.brand,
      type: bebida.type,
      sales: bebida.sales,
      count: bebida.count,
      month: bebida.month,
    };

    this.bebidasService.crearBebida(input).subscribe({
      next: () => {
        bebida.isNew = false;
        this.crearGrafico(this.datos);
      },
      error: () => {
        console.error('Error al crear bebida');
      },
    });
  }

  focusNext(event: KeyboardEvent, next: HTMLInputElement) {
    event.preventDefault();
    next.focus();
  }

  onCreateEnter(event: KeyboardEvent, bebida: Bebida) {
    event.preventDefault();
    this.checkCreate(bebida);
  }
}
