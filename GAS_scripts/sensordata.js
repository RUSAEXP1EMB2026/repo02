function calcDiscomfortIndex(temp, humidity) {
	var di = 0.81 * temp + 0.01 * humidity * (0.99 * temp - 14.3) + 46.3;
	return Math.round(di * 10) / 10;
}
