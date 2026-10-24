import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ContactDirectoryComponent } from "../contacts/contact-directory.component";

@Component({
  selector: "app-suppliers-page",
  standalone: true,
  imports: [ContactDirectoryComponent],
  template: `<app-inventory-contacts [kind]="'suppliers'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersPageComponent {}
