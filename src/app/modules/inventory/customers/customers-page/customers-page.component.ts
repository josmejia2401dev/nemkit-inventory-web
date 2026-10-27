import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ContactDirectoryComponent } from "../../contacts/contact-directory.component";

@Component({
  selector: "app-customers-page",
  standalone: true,
  imports: [ContactDirectoryComponent],
  templateUrl: "./customers-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPageComponent {}
