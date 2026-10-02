package ir.shopet;

import org.springframework.boot.SpringApplication;

public class TestShopetApplication {

	public static void main(String[] args) {
		SpringApplication.from(ShopetApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
