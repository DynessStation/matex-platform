import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IProduct, IProductModel } from '../../shared/interface/product.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { DeleteProductAction, GetProductsAction } from '../../shared/store/action/product.action';
import { ProductState } from '../../shared/store/state/product.state';

@Component({
  selector: 'app-product',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './product.html', styleUrl: './product.scss',
})
export class Product {
  private store=inject(Store); private router=inject(Router);
  product$:Observable<IProductModel>=this.store.select(ProductState.product);
  filter:Params={search:'',page:1,paginate:15};
  tableConfig:ITableConfig={
    columns:[
      {title:'image',dataField:'product_thumbnail',class:'tbl-image',type:'image',placeholder:'assets/images/product.png'},
      {title:'name',dataField:'name',sortable:true,sort_direction:'desc'},
      {title:'sku',dataField:'sku',sortable:true,sort_direction:'desc'},
      {title:'price',dataField:'price_display'},
      {title:'stock',dataField:'stock'},
      {title:'status',dataField:'status_label'},
    ],
    rowActions:[
      {label:'Edit',actionToPerform:'edit',icon:'ri-pencil-line',permission:'product.update'},
      {label:'Delete',actionToPerform:'delete',icon:'ri-delete-bin-line',permission:'product.delete'},
      {label:'View',actionToPerform:'view',icon:'ri-eye-line'},
    ],data:[],total:0,
  };
  ngOnInit(){this.product$.subscribe(model=>{const data=(model?.data??[]).map(item=>({...item,price_display:item.price_visibility==='displayed'?new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(item.price):'Hubungi kami',stock:item.stock_status?.replaceAll('_',' ')||'-',status_label:String(item.status)}));this.tableConfig.data=data;this.tableConfig.total=model?.total??0;});}
  onTableChange(data?:Params){this.filter={...this.filter,...data};this.store.dispatch(new GetProductsAction(this.filter));}
  onActionClicked(action:ITableClickedAction){if(action.actionToPerform==='edit')void this.router.navigateByUrl(`/product/edit/${action.data.id}`);if(action.actionToPerform==='delete')this.store.dispatch(new DeleteProductAction(action.data.id)).subscribe(()=>this.onTableChange());if(action.actionToPerform==='view')window.open(`/product/${action.data.slug}`,'_blank');}
}
